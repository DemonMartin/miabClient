import { ImapFlow } from "imapflow";
import { uniqueUsernameGenerator } from "unique-username-generator";
import { simpleParser } from "mailparser";
import axios from "axios";

/**
 * Represents a client for interacting with a Mail-in-a-Box server.
 */
class MiabClient {
    /**
     * @param {String} apiUrl URL like https://box.example.com
     * @param {String} apiEmail Admin Email Address
     * @param {String} apiPassword Admin Password
     */
    constructor(apiUrl, apiEmail, apiPassword, debug = false) {
        if (!apiUrl || !apiEmail || !apiPassword) throw new Error('The apiUrl, apiEmail and apiPassword must be provided.');
        this.apiUrl = apiUrl;
        this.apiEmail = apiEmail;
        this.apiPassword = apiPassword;

        this.apiKey = Buffer.from(apiEmail + ':' + apiPassword).toString('base64');
        this.debug = debug;
    }

    genUsername() {
        return uniqueUsernameGenerator({
            dictionaries: [[
                'anna',
                'maria',
                'julia',
                'sophia',
                'emily',
                'emma',
                'olivia',
                'isabella',
                'ava',
                'mia',
                'madison',
                'elizabeth',
                'abigail',
                'hannah',
                'addison',
                'mike',
                'john',
                'david',
                'james',
                'robert',
                'michael',
                'william',
                'joseph',
                'charles',
                'thomas',
                'christopher',
                'daniel',
                'matthew',
                'anthony',
                'mark',
                'donald',
                'steven',
                'paul',
                'andrew',
                'joshua',
                'kenneth',
                'kevin',
                'brian',
                'george',
                'edward',
            ], [
                'smith',
                'johnson',
                'williams',
                'brown',
                'jones',
                'miller',
                'davis',
                'garcia',
                'rodriguez',
                'wilson',
                'martinez',
                'anderson',
                'taylor',
                'thomas',
                'hernandez',
                'moore',
                'martin',
                'jackson',
                'thompson',
                'white',
                'lopez',
                'lee',
                'gonzalez',
                'harris',
                'clark',
                'lewis',
                'robinson',
                'walker',
                'perez',
                'hall',
                'young',
                'allen',
                'sanchez',
                'wright',
                'king',
                'scott',
                'green',
                'baker',
                'adams',
                'nelson',
                'hill',
                'ramirez',
                'campbell',
                'mitchell',
                'roberts',
                'carter',
                'phillips',
                'evans',
                'turner',
                'torres',
                'parker',
            ], [
                // aa-zz
                ...(Array.from({ length: 26 }, (_, i) =>
                    Array.from({ length: 26 }, (_, j) =>
                        String.fromCharCode(97 + i) + String.fromCharCode(97 + j)
                    )
                ).flat())
            ],
            [
                // 0-99
                ...(
                    Array.from({ length: 100 }, (_, i) => i)
                )
            ]
            ],
            separator: ''
        });
    }

    generatePassword(length = 12) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    async #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #request(method, url, data = null) {
        /** 
         * @type {import('axios').AxiosRequestConfig}
         */
        const config = {
            method: method,
            url: url,
            headers: {
                'Authorization': 'Basic ' + this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 5 * 60 * 1000,
            data: data
        };
        return axios(config);
    }

    async #get(url) {
        return this.#request('get', url);
    }

    async #post(url, data) {
        return this.#request('post', url, data);
    }

    /**
     * Method to create a new mailbox
     * @param {String} domain The domain name to create the mailbox on
     * @param {String} username The username of the mailbox
     * @param {String} password Minimum 8 characters
     * @returns 
     */
    async createMailbox(domain, username = this.genUsername(), password = this.generatePassword()) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/users/add',
                `email=${username}@${domain}&password=${password}`
            )

            const data = response.data.trim();

            if (data !== 'mail user added') {
                throw new Error(data);
            }

            return {
                success: true,
                response: data,
                email: username + '@' + domain,
                password: password
            }
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * Method to delete an existing mailbox
     * @param {String} email 
     * @returns 
     */

    async deleteMailbox(email) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/users/delete',
                `email=${email}`
            )

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * @typedef {import('mailparser').ParsedMail} ParsedMail
     */

    /**
     * Method to get all emails from a mailbox
     * @param {String} email 
     * @param {String} password 
     * @returns {Promise<{success: Boolean, response: ParsedMail[]>}
     */
    async getEmails(email, password) {
        try {
            /**
             * @type {ImapFlow}
             */
            const client = new ImapFlow({
                host: new URL(this.apiUrl).host,
                port: 993,
                secure: true,
                auth: {
                    user: email,
                    pass: password
                },
                logger: false,
                maxIdleTime: 60000
            });

            await client.connect();
            const mailbox = await client.mailboxOpen('INBOX');

            if (mailbox.exists === 0) {
                await client.logout();
                return { success: true, response: [] };
            }

            const messagesFunc = client.fetch('1:*', { source: true });
            const messages = [];

            for await (const msg of messagesFunc) {
                const parsed = await simpleParser(msg.source);
                messages.push(parsed);
            }

            await client.logout();
            return { success: true, response: messages };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    #isRegex(str) {
        try {
            new RegExp(str);
            return true;
        } catch (error) {
            return false;

        }
    }

    /**
     * Method to filter emails
     * @param {ParsedMail[]} emails 
     * @param {Object} options - The filtering options.
     * @param {String[] | RegExp[]} options.regex - The regex patterns to match.
     * @param {String} options.from - The sender's email address.
     * @param {String} options.subject - The email subject.
     * @returns {ParsedMail[]}
     */
    filterEmails(emails, options = {}) {
        let { regex = [], from = '', subject = '' } = options;

        if (regex.length === 0 && from === '' && subject === '') {
            throw new Error('At least one option must be specified. All options cannot be default values.');
        }

        if (!Array.isArray(regex)) {
            console.error('The regex option must be an array. Trying to experimentally convert it to an array.');

            if (this.#isRegex(regex) || typeof regex === 'string') {
                regex = [regex];
            } else {
                throw new Error('The regex option must be an array and either a valid string or regex. Failed to experimentally convert it to an array.');
            }
        }

        return emails.filter(email => {
            // Check if the email matches the regex patterns.
            const regexMatch = Array.isArray(regex) ? regex.some(r => {
                if (this.#isRegex(r)) {
                    const regex = new RegExp(r);
                    return regex.test(email.textAsHtml) || regex.test(email.text);
                } else {
                    return email.textAsHtml.includes(r) || email.text.includes(r);
                }
            }) : true;

            // Check if the email is from the specified sender.
            const fromMatch = from ? email.from.text.includes(from) : true;

            // Check if the email has the specified subject.
            const subjectMatch = subject ? email.subject.includes(subject) : true;

            return regexMatch && fromMatch && subjectMatch;
        });
    }

    /**
     * Method to wait for an specific email
     * @param {Object} options - The options for the waitForEmail method.
     * @param {String} options.email - The email address.
     * @param {String} options.password - The email password.
     * @param {String} options.from - The sender's email address.
     * @param {String} options.subject - The email subject.
     * @param {String[] | RegExp[]} options.regex - The regex patterns to match.
     * @param {Number} options.timeout - The timeout in milliseconds.
     * @param {Number} options.interval - The interval in milliseconds.
     * @returns {Promise<{success: Boolean, response: ParsedMail} | {success: Boolean, response: String}>}
     * @throws {Error} - On error
     */
    async waitForEmail(options) {
        const { from, subject, regex, timeout = 5 * 60 * 1000, interval = 3000 } = options;
        const { email, password } = options;

        if (!email || !password) {
            return { success: false, response: 'The email and password must be provided.' };
        }


        if (!from && !subject && !regex) {
            return { success: false, response: 'At least one filtering of the options must be provided.' };
        }

        const start = Date.now();
        let emails = [];

        while (Date.now() - start < timeout) {
            emails = (await this.getEmails(email, password)).response;
            const filteredEmails = this.filterEmails(emails, { from, subject, regex });

            this.debug && console.log('Filtered Emails:', filteredEmails);

            if (filteredEmails.length > 0) {
                return { success: true, response: filteredEmails[0] };
            }

            this.debug && console.log('Email not found within the timeout. Waiting...');
            await this.#sleep(interval);
        }

        return { success: false, response: 'Email not found within the timeout.' }
    }

    /**
     * Method to get the email address of the admin
     * @returns {String}
     */
    getEmail() {
        return this.apiEmail;
    }

    /**
     * Method to get the password of the admin
     * @returns {String}
     */
    getPassword() {
        return this.apiPassword;
    }

    /** 
     * Method to change the email address of the admin
     */
    setEmail(email) {
        this.apiEmail = email;
        this.apiKey = Buffer.from(email + ':' + this.apiPassword).toString('base64');
    }

    /**
     * Method to change the password of the admin
     */
    setPassword(password) {
        this.apiPassword = password;
        this.apiKey = Buffer.from(this.apiEmail + ':' + password).toString('base64');
    }

    /**
     * Method used to make a mail user an admin
     * @param {String} email
     * @returns {Promise<{success: Boolean, response: String}>}
     */
    async makeAdmin(email) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/users/privileges/add',
                `email=${email}&privilege=admin`
            )

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * Method used to remove admin privileges from a mail user
     * @param {String} email
     * @returns {Promise<{success: Boolean, response: String}>}
     */
    async removeAdmin(email) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/users/privileges/remove',
                `email=${email}`
            )

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * @typedef {Object} User
     * @property {String} email
     * @property {privileges: String[]} privileges
     * @property {String} status
     */

    /**
     * @typedef {Object} Mailbox
     * @property {String} domain
     * @property {User[]} users
     */

    /**
     * Method to get all mailboxes
     * @returns {Promise<{success: Boolean, response: Mailbox[], emails: String[]}>}
    */
    async getMailboxes() {
        try {
            const response = await this.#get(this.apiUrl + '/admin/mail/users?format=json');

            if (Array.isArray(response.data)) {
                const emails = response.data.map(mailbox => mailbox.users.map(user => user.email)).flat();
                return { success: true, response: response.data, emails: emails };
            } else {
                return { success: false, response: response.data };
            }
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * Method to get all mail aliases
     * @returns {Promise<{success: Boolean, response: Object[]}>}
    */
    async getMailAliases() {
        try {
            const response = await this.#get(this.apiUrl + '/admin/mail/aliases?format=json');

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * Method to add a new mail alias
     * @param {String} address Email address
     * @param {String} forwardsTo Email address to forward to
     * @returns {Promise<{success: Boolean, response: String}>}
    */
    async addMailAlias(address, forwardsTo) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/aliases/add',
                `address=${address}&forwards_to=${forwardsTo}`);

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * Method to remove a mail alias
     * @param {String} address
     * @returns {Promise<{success: Boolean, response: String}>}
    */
    async removeMailAlias(address) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/aliases/remove',
                `address=${address}`);

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * Method to set the password of a mailbox
     * @param {String} email
     * @param {String} password
     * @returns {Promise<{success: Boolean, response: String}>}
     */

    async updatePassword(email, password = this.generatePassword(12)) {
        try {
            const response = await this.#post(this.apiUrl + '/admin/mail/users/password',
                `email=${email}&password=${password}`);

            return { success: true, response: response.data, email: email, password: password };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * @typedef {Object} WebDomain
     * @property {String} custom_root The custom root directory for the web domain
     * @property {String} domain The domain name
     * @property {String} root The root directory for the web domain
     * @property {String[]} ssl_certificate The SSL certificate for the web domain
     * @property {String} static_enabled 
     */

    /**
     * Method to get the web domains
     * @returns {Promise<{success: Boolean, response: WebDomain[], domains: String[]}>}
     */
    async getWebDomains() {
        try {
            const response = await this.#get(this.apiUrl + '/admin/web/domains',);

            return { success: true, response: response.data, domains: response.data.map(domain => domain.domain) };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }

    /**
     * 
     * @returns {Promise<{success: Boolean, response: String}>}
     */
    async getVersion() {
        try {
            const response = await this.#get(this.apiUrl + '/admin/system/version');

            return { success: true, response: response.data };
        } catch (error) {
            return { success: false, response: error?.response?.data || error };
        }
    }
}

export default MiabClient;