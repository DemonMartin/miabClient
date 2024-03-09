# MiabClient

MiabClient is a simple module for interacting with the Mail-in-a-Box API with additional features. It provides a client for sending requests to a Mail-in-a-Box server, including methods for getting and setting the admin email, generating passwords, and fetching emails from a mailbox.

This client includes all neccessary methods to be used as an self-made kopeechka alternative.

### MIAB: https://mailinabox.email/

## Installation

You can install MiabClient using npm:

```sh
npm install miabclient
```

## Requirements
You must have a fully setuped and working Mail-in-a-Box server, read here how to setup: https://mailinabox.email/guide.html

## Usage

Here's an example of how you can use MiabClient to create an email and read emails:

```javascript
import MiabClient from "miabclient";

// Initialize the client
const client = new MiabClient('https://your-domain.com', 'admin@your-domain.com', 'your-password');

async function main() {
    // Create a mailbox
    const mailbox = await client.createMailbox('your-domain.com'
        // 'username', // optional
        // 'password' // optional
    );
    console.log(mailbox); // { success: true, email: 'email@your-domain.com', password: 'password' }

    // Get emails
    const emails = await client.getEmails(mailbox.email, mailbox.password);
    console.log(emails); // { success: true, response: [ { ... }, { ... }, ... ] }

    // Wait for an email
    const email = await client.waitForEmail({
        email: mailbox.email,
        password: mailbox.password,
        regex: [
            'This text is in the email',
            
            // also supports regex in the form of a string
            '/This text is in the email/^i'	
        ]
    });

    console.log(email); // { success: true, response: { ... } }
}
```

Please replace `'https://your-domain.com'`, `'admin@your-domain.com'`, `'your-password'`, and `'mailbox@your-domain.com'` with your actual domain, admin email, password, and mailbox respectively.

## Additional Information
The module is based on the `v67`. [03.2024]

## License

MiabClient is [ISC licensed](./LICENSE).