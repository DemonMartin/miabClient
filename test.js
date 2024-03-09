import MiabClient from "./index.js";

const testDomain = '';
const testUrl = 'https://' + testDomain;
const testApiEmail = '';
const testApiPassword = '';

const testEmail = '';
const testPassword = '';


const client = new MiabClient(testUrl, testApiEmail, testApiPassword);

async function main() {
    const mailbox = await client.createMailbox('ticktack.tips');
    console.log(mailbox);
}

async function readEmails() {
    const emails = await client.getEmails(testEmail, testPassword);
    console.log(emails.response[0]);
}

async function getSpecficMail() {
    const email = await client.waitForEmail({
        email: testEmail,
        password: testPassword,
        regex: ['confirm']
    })
    console.log(email);
}

async function getMailboxes() {
    const mailboxes = await client.getMailboxes();
    console.log(mailboxes);
}

async function getWebDomains() {
    const domains = await client.getWebDomains();
    console.log(domains);
}



main();
readEmails();
getSpecficMail();
getMailboxes();
getWebDomains();
