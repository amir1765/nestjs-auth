import * as speakeasy from 'speakeasy';

export  function generateTOTPSecret(userEmail: string) {
  const secret = speakeasy.generateSecret({
    name: `YourApp (${userEmail})`,
  });

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}