"""Cross-cutting foundations.

These exist before feature work because retrofitting any of them is a rewrite:
tenant isolation, the audit trail, idempotency, the transactional outbox, the
error contract, and PII-redacting logs.
"""
