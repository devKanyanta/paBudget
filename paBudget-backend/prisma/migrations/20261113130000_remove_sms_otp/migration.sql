-- SMS / OTP phone verification removed.
DROP TABLE IF EXISTS "OtpCode";
ALTER TABLE "User" DROP COLUMN IF EXISTS "phoneVerifiedAt";
