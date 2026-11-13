import { beforeAll, describe, expect, it } from 'vitest';
import { api, resetDb, makeUser, sentCodes, prisma } from './helpers.js';

beforeAll(resetDb);

describe('auth', () => {
  it('registers, logs in, reads /me, rotates refresh tokens', async () => {
    const reg = await api().post('/auth/register').send({ name: 'Chanda', email: 'Chanda@Test.com', password: 'secret1234' }).expect(201);
    expect(reg.body.accessToken).toBeTruthy();
    expect(reg.body.user.email).toBe('chanda@test.com');
    await api().post('/auth/register').send({ name: 'Dup', email: 'chanda@test.com', password: 'secret1234' }).expect(409);
    await api().post('/auth/login').send({ email: 'chanda@test.com', password: 'wrong-pass' }).expect(401);
    const login = await api().post('/auth/login').send({ email: 'chanda@test.com', password: 'secret1234' }).expect(200);
    const me = await api().get('/me').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
    expect(me.body.trustLevel).toBe('NEW');
    const r1 = await api().post('/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(200);
    expect(r1.body.refreshToken).not.toBe(login.body.refreshToken);
    // reusing the old token is rejected and revokes the family
    await api().post('/auth/refresh').send({ refreshToken: login.body.refreshToken }).expect(401);
    await api().post('/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(401);
  });

  it('validates input and requires auth', async () => {
    await api().post('/auth/register').send({ name: 'X', email: 'bad', password: 'short' }).expect(400);
    await api().get('/me').expect(401);
    await api().get('/me').set('Authorization', 'Bearer nope').expect(401);
  });

  it('phone OTP signs up, verifies and attaches to an existing account', async () => {
    await api().post('/auth/otp/request').send({ phone: '0971234567' }).expect(204);
    await api().post('/auth/otp/verify').send({ phone: '0971234567', code: '000000' }).expect(401);
    const code = sentCodes.get('+260971234567')!;
    const v = await api().post('/auth/otp/verify').send({ phone: '0971234567', code, name: 'Mwila' }).expect(200);
    expect(v.body.user.phoneVerified).toBe(true);
    expect(v.body.user.phone).toBe('+260971234567');
    // code is single-use
    await api().post('/auth/otp/verify').send({ phone: '0971234567', code }).expect(401);

    const u = await makeUser({ verified: false });
    await api().post('/auth/otp/request').send({ phone: '0961111111' }).expect(204);
    await api().post('/auth/otp/verify').set(u.auth).send({ phone: '0961111111', code: sentCodes.get('+260961111111')! }).expect(200);
    const me = await api().get('/me').set(u.auth);
    expect(me.body.phoneVerified).toBe(true);
  });

  it('limits OTP requests per phone', async () => {
    for (let i = 0; i < 5; i++) await api().post('/auth/otp/request').send({ phone: '0955555555' }).expect(204);
    await api().post('/auth/otp/request').send({ phone: '0955555555' }).expect(429);
  });

  it('deletes account and personal data', async () => {
    const u = await makeUser();
    await api().delete('/me').set(u.auth).expect(204);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.email).toBeNull();
    expect(row.deletedAt).not.toBeNull();
    await api().post('/auth/login').send({ email: u.email, password: 'password123' }).expect(401);
  });
});
