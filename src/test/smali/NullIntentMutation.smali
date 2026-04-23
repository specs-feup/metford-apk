.class public LNullIntentTest;
.super Ljava/lang/Object;

.method public static startActivity(Landroid/content/Context;)V
    .locals 2

    new-instance v0, Landroid/content/Intent;
    invoke-direct {v0, p0}, Landroid/content/Intent;-><init>(Landroid/content/Context;)V

    invoke-virtual {p0, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    return-void
.end method
