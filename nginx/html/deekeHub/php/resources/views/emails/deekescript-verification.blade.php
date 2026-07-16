<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <title>{{ $brand }}</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <p>您好，</p>
    <p>您正在进行「{{ $purposeLabel }}」操作，验证码为：</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{{ $code }}</p>
    <p>验证码 {{ $ttlMinutes }} 分钟内有效，请勿泄露给他人。</p>
    <p>如非本人操作，请忽略本邮件。</p>
</body>
</html>
