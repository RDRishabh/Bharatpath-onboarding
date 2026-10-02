# Spend alerts (2026-10-01).
#
# The account runs on promotional credits, and on AWS's Free plan the account
# CLOSES when they run out -- resources stop and are deleted after 90 days.
# So the alert that matters is the one that fires early.
#
# **`include_credit = false` is the whole point.** Budgets nets credits off
# by default, and with credits covering everything the net cost is zero: a
# budget left at the default never fires, however fast the credits drain.
# Measured gross, it reports what the month is actually spending.

resource "aws_budgets_budget" "monthly" {
  count = var.budget_alert_email != "" ? 1 : 0

  name         = "${var.project}-${var.environment}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_monthly_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_types {
    include_credit = false
    include_refund = false
  }

  dynamic "notification" {
    for_each = [33, 67, 100]
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }

  # The forecast catches a doubled bill in its first days, not at month end.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
