App: .class public LNullPutExtraTest;
.super Ljava/lang/Object;

.method public static sendData(Landroid/content/Intent;Ljava/lang/String;)V
	.locals 2

	const-string v0, "key"

	sget v1, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v1, v1, -0x1
	packed-switch v1, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	const-string v0, "__metford_invalid_key__"
	invoke-virtual {p0, v0, p1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
	goto :pswitch_1_end
	:pswitch_1_default
	invoke-virtual {p0, v0, p1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	.end packed-switch
	:pswitch_1_end

	return-void 
.end method

