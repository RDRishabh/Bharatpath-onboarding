# Celery's broker. The transactional outbox (plan.md 5.4) relays into
# this queue -- the relay is what makes "write a row and publish an event"
# atomic, so the queue itself can stay a plain standard queue.

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project}-tasks-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days, the maximum
}

resource "aws_sqs_queue" "tasks" {
  name = "${var.project}-tasks-${var.environment}"

  # Long polling. Short polling on an idle queue is the single easiest way
  # to turn a free-tier queue into a real bill, because it bills per
  # receive call and an idle worker spins.
  receive_wait_time_seconds = 20

  # Must exceed the slowest task. Resume parse and scoring are the long
  # ones; 15 minutes matches the Lambda ceiling they may later move to.
  visibility_timeout_seconds = 900
  message_retention_seconds  = 345600 # 4 days

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    # A task that has failed five times is not going to succeed on the
    # sixth. Park it where someone can look at it rather than letting it
    # cycle forever.
    maxReceiveCount = 5
  })
}
