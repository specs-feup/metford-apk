App: .class public LLengthyGUICreationTest;
.super Landroid/app/Activity;

.method public onCreate(Landroid/os/Bundle;)V
	.locals 2

	sget v0, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v0, v0, -0x1
	packed-switch v0, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
	const-wide/16 v0, 0x2710
	invoke-static {v0, v1}, Ljava/lang/Thread;->sleep(J)V
	goto :pswitch_1_end
	:pswitch_1_default
	invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	.end packed-switch
	:pswitch_1_end

	return-void 
.end method

