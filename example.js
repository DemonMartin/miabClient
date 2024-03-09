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