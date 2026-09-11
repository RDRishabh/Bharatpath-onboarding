# The identity the backend runs as. During the sprint the API runs on a
# laptop, so this is an IAM user with keys. When the app moves to ECS or
# App Runner (plan.md Day 20) the policy below attaches to a task role
# instead and the user is deleted -- the permissions do not change, only
# what assumes them.

resource "aws_iam_user" "app" {
  name = "${var.project}-app-${var.environment}"
}

data "aws_iam_policy_document" "app" {
  # Objects only, not buckets. The app never needs to create, delete or
  # reconfigure a bucket, and a credential that leaks off a developer
  # laptop should not be able to.
  statement {
    sid    = "ObjectAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
    ]
    resources = [for b in aws_s3_bucket.this : "${b.arn}/*"]
  }

  # Needed to presign and to list a prefix; scoped to these buckets only.
  statement {
    sid       = "BucketListing"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [for b in aws_s3_bucket.this : b.arn]
  }

  statement {
    sid    = "TaskQueue"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ChangeMessageVisibility",
    ]
    resources = [aws_sqs_queue.tasks.arn, aws_sqs_queue.dlq.arn]
  }

  # OCR fallback for scanned CVs. Textract reads the object from S3 itself,
  # which is why the S3 grant above is what makes this work -- there is no
  # separate "let Textract read the bucket" permission for the async API when
  # the caller and the bucket share an account.
  #
  # Detection only. AnalyzeDocument (forms and tables) costs roughly ten times
  # as much per page and is not used: a CV is prose, not a form.
  statement {
    sid    = "DocumentOcr"
    effect = "Allow"
    actions = [
      "textract:StartDocumentTextDetection",
      "textract:GetDocumentTextDetection",
      "textract:DetectDocumentText",
    ]
    # Textract exposes no resource ARNs for these operations.
    resources = ["*"]
  }

  statement {
    sid       = "ReadSecrets"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.app.arn, aws_secretsmanager_secret.twilio.arn]
  }

  # Read-only against Cognito. The API verifies tokens against the public
  # JWKS, which needs no credentials at all; these calls are for looking a
  # user up by sub. Nothing here can create a user or change a password,
  # because account lifecycle belongs to the pools' own flows.
  statement {
    sid    = "CognitoRead"
    effect = "Allow"
    actions = [
      "cognito-idp:GetUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:ListUsers",
    ]
    resources = [
      aws_cognito_user_pool.candidates.arn,
      aws_cognito_user_pool.business.arn,
    ]
  }
}

resource "aws_iam_user_policy" "app" {
  name   = "${var.project}-app-${var.environment}"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app.json
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
