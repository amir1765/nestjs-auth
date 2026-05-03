export const resetPasswordTemplate = (url: string) => {
  return `
    <div style="font-family:sans-serif">
      <h2>Reset your password</h2>
      <p>Click below to reset:</p>
      <a href="${url}">Reset Password</a>
    </div>
  `;
};