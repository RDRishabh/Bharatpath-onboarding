# These map one-to-one onto the settings in backend/app/settings.py.
# `terraform output -raw env_file > ../../backend/.env.aws` writes a file
# the app can source directly.

output "cognito_candidate_pool_id" {
  value = aws_cognito_user_pool.candidates.id
}

output "cognito_business_pool_id" {
  value = aws_cognito_user_pool.business.id
}

output "cognito_candidate_client_id" {
  value = aws_cognito_user_pool_client.candidates.id
}

output "cognito_business_client_id" {
  value = aws_cognito_user_pool_client.business.id
}

output "bucket_names" {
  value = local.bucket_names
}

output "sqs_queue_url" {
  value = aws_sqs_queue.tasks.url
}

output "app_access_key_id" {
  value = aws_iam_access_key.app.id
}

# Marked sensitive so it is not echoed in logs or CI output.
# Read deliberately with: terraform output -raw app_secret_access_key
output "app_secret_access_key" {
  value     = aws_iam_access_key.app.secret
  sensitive = true
}

output "env_file" {
  description = "Paste-ready environment block for backend/.env"
  sensitive   = true
  value       = <<-EOT
    AWS_REGION=${var.aws_region}
    AWS_ACCESS_KEY_ID=${aws_iam_access_key.app.id}
    AWS_SECRET_ACCESS_KEY=${aws_iam_access_key.app.secret}

    COGNITO_CANDIDATE_POOL_ID=${aws_cognito_user_pool.candidates.id}
    COGNITO_BUSINESS_POOL_ID=${aws_cognito_user_pool.business.id}
    COGNITO_CANDIDATE_CLIENT_ID=${aws_cognito_user_pool_client.candidates.id}
    COGNITO_BUSINESS_CLIENT_ID=${aws_cognito_user_pool_client.business.id}

    S3_BUCKET_RESUMES=${local.bucket_names["resumes"]}
    S3_BUCKET_KYB_DOCUMENTS=${local.bucket_names["kyb_documents"]}
    S3_BUCKET_INTERVIEW_AUDIO=${local.bucket_names["interview_audio"]}
    S3_BUCKET_EXPORTS=${local.bucket_names["exports"]}
    S3_BUCKET_AUDIT_ARCHIVE=${local.bucket_names["audit_archive"]}
    S3_BUCKET_COURSE_MEDIA=${local.bucket_names["course_media"]}

    CELERY_BROKER_URL=sqs://
    SQS_QUEUE_URL=${aws_sqs_queue.tasks.url}

    # Local tokens must be OFF once real Cognito pools exist.
    AUTH_ALLOW_LOCAL_TOKENS=false
  EOT
}
