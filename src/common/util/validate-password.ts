
export function validatePassword(password: string):boolean{

  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[#@$%!&^]).{8,}$/.test(password);
}