import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MAIL_CONFIG } from './mail.constants';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: MAIL_CONFIG.host,
      port: MAIL_CONFIG.port,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }) {
    // return this.transporter.sendMail({
    //   from: '"Auth System" <no-reply@auth.com>',
    //   to: options.to,
    //   subject: options.subject,
    //   html: options.html,
    // });
    console.log(options);
    return
  }
}