export const verifyEmailTemplate = (url: string) => {
  return `
    <div style="font-family:sans-serif">
      <h2>Verify your email</h2>
      <p>Click the button below to verify your account:</p>
      <a href="${url}" 
         style="padding:10px 20px;background:#000;color:#fff;text-decoration:none;">
         Verify Email
      </a>
    </div>
  `;
};