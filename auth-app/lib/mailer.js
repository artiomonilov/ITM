import nodemailer from 'nodemailer';

export const sendResetEmail = async (email, resetUrl) => {
  // Configurare SMTP (acestea trebuie să le treci în fișierul .env)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });

  const mailOptions = {
    from: `"Platfroma De Login" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Resetare Parolă",
    html: `
      <h2>Resetare parolă</h2>
      <p>Ați solicitat resetarea parolei pentru contul asociat acestui email.</p>
      <p>Pentru a alege o parolă nouă, vă rugăm să faceți click pe link-ul de mai jos:</p>
      <a href="${resetUrl}" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Resetează Parola</a>
      <br/><br/>
      <p><i>Link-ul expira in 1 ora. Dacă nu ați solicitat acest lucru, puteți ignora acest email.</i></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return false;
  }
};

export const sendActivationEmail = async (email, activationUrl) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });

  const mailOptions = {
    from: `"Platfroma De Login" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Activare Cont",
    html: `
      <h2>Bine ai venit!</h2>
      <p>Te-ai înregistrat cu succes pe platformă, dar contul tău necesită activare.</p>
      <p>Pentru a-ți activa contul și a putea face login, dă click pe butonul de mai jos:</p>
      <a href="${activationUrl}" style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Activează Contul</a>
      <br/><br/>
      <p><i>Acest link expira in 24 de ore. Dacă nu ai creat tu acest cont, ignoră e-mail-ul.</i></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return false;
  }
};
