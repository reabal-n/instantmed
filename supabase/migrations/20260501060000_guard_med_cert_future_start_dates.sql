-- Defence-in-depth for medical certificate date policy.
-- Application code rejects future start dates before checkout, approval,
-- in-place reissue/date correction, and legacy render/preview paths. This constraint prevents a
-- future writer from persisting a future-dated issued certificate.

ALTER TABLE public.issued_certificates
  DROP CONSTRAINT IF EXISTS issued_certificates_start_date_not_future;

ALTER TABLE public.issued_certificates
  ADD CONSTRAINT issued_certificates_start_date_not_future
  CHECK (start_date <= CURRENT_DATE)
  NOT VALID;
