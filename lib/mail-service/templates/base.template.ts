// ==========================================
// Base Email HTML Layout Template
// ==========================================

export interface BaseEmailLayoutOptions {
  title: string;
  badge?: string;
  bodyHtml: string;
  footerText?: string;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export function renderBaseEmailLayout(options: BaseEmailLayoutOptions): string {
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #09090b;
            color: #f4f4f5;
            margin: 0;
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          }
          .header {
            text-align: center;
            padding-bottom: 24px;
            border-bottom: 1px solid #27272a;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
          }
          .logo span {
            color: #6366f1;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            background-color: rgba(99, 102, 241, 0.15);
            color: #818cf8;
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          .content {
            padding: 24px 0;
            line-height: 1.6;
            color: #d4d4d8;
          }
          .h1 {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 16px;
          }
          .button-wrapper {
            text-align: center;
            margin: 32px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #6366f1;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }
          .otp-box {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #818cf8;
            background-color: #27272a;
            padding: 18px;
            border-radius: 8px;
            margin: 24px 0;
            border: 1px solid #3f3f46;
            text-align: center;
          }
          .footer {
            padding-top: 24px;
            border-top: 1px solid #27272a;
            text-align: center;
            font-size: 12px;
            color: #71717a;
          }
          .link-alt {
            word-break: break-all;
            font-size: 12px;
            color: #818cf8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Test<span>Loom</span></div>
          </div>
          <div class="content">
            ${options.badge ? `<div class="badge">${options.badge}</div>` : ""}
            ${options.bodyHtml}
          </div>
          <div class="footer">
            ${options.footerText ? `<p>${options.footerText}</p>` : ""}
            <p>&copy; ${currentYear} TestLoom Automation Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
