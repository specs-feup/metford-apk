App: .class public LNullIntentTest;
.super Ljava/lang/Object;

.method public static startActivity(Landroid/content/Context;)V
	.locals 3

	sget v2, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v2, v2, -0x1
	packed-switch v2, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	const/4 v0, 0x0
	goto :pswitch_1_end
	:pswitch_1_default
	new-instance v0, Landroid/content/Intent;
	new-instance v0, Landroid/content/Intent;
	invoke-direct {v0, p0}, Landroid/content/Intent;-><init>(Landroid/content/Context;)V
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	.end packed-switch
	:pswitch_1_end

	invoke-virtual {p0, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

	return-void 
.end method

