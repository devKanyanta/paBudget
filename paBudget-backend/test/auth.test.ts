import { beforeAll, describe, expect, it } from 'vitest';
import { api, resetDb, makeUser, prisma } from './helpers.js';

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

  it('registers and logs in with a phone number and password', async () => {
    const reg = await api().post('/auth/register').send({ name: 'Mwila', phone: '0971234567', password: 'secret1234' }).expect(201);
    expect(reg.body.user.phone).toBe('+260971234567');
    await api().post('/auth/login').send({ phone: '0971234567', password: 'secret1234' }).expect(200);
    await api().post('/auth/register').send({ name: 'Dup', phone: '+260971234567', password: 'secret1234' }).expect(409);
    await api().post('/auth/register').send({ name: 'Bad', phone: '12', password: 'secret1234' }).expect(400);
    await api().post('/auth/register').send({ name: 'None', password: 'secret1234' }).expect(400);
  });

  it('has no SMS/OTP endpoints', async () => {
    await api().post('/auth/otp/request').send({ phone: '0971234567' }).expect(404);
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
