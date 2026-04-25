import nodemailer from 'nodemailer';

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

export const sendResetEmail = async (email, resetUrl) => {
  const transporter = createTransporter();

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
  const transporter = createTransporter();

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

export const sendCourseAssignmentEmail = async (email, courseName, teacherName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Platfroma De Login" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Ai fost înscris la o nouă materie: ${courseName}`,
    html: `
      <h2>Salutare!</h2>
      <p>Ai fost înscris ca student în noul curs: <strong>${courseName}</strong>.</p>
      <p>Acest curs a fost creat și îți este predat de către profesorul <strong>${teacherName}</strong>.</p>
      <br/><br/>
      <p>Te rugăm să te conectezi în platformă pentru a vizualiza lista de cursuri.</p>
    `,
    
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Nodemailer Error (Course Assignment):', error);
    return false;
  }
};

export const sendSubscriptionCredentialsEmail = async (email, teacherName, courseName, credentialsList) => {
  const transporter = createTransporter();

  const credentialsMarkup = credentialsList.map((entry, index) => `
    <li style="margin-bottom: 10px;">
      <strong>Abonament ${index + 1}</strong><br/>
      Username: <code>${entry.username}</code><br/>
      Password: <code>${entry.password}</code><br/>
      VPS IP: <code>${entry.ip}</code>
    </li>
  `).join('');

  const mailOptions = {
    from: `"Platfroma De Login" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Credențiale abonamente pentru cursul ${courseName}`,
    html: `
      <h2>Resurse aprobate pentru profesor</h2>
      <p>Salut, <strong>${teacherName}</strong>!</p>
      <p>Administratorul a aprobat abonamentele VPS pentru cursul <strong>${courseName}</strong>.</p>
      <p>Mai jos găsești credențialele generate automat din resourceService, pe care le poți distribui studenților în timpul laboratoarelor:</p>
      <ol>${credentialsMarkup}</ol>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Nodemailer Error (Subscription Credentials):', error);
    return false;
  }
};
  
