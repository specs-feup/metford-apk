App: .class public LBuggyGUIListenerTest;
.super Ljava/lang/Object;

.method public static attachListener(Landroid/view/View;Landroid/view/View$OnClickListener;)V
	.locals 1

	sget v0, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v0, v0, -0x1
	packed-switch v0, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	const/4 p1, 0x0
	invoke-virtual {p0, p1}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
	goto :pswitch_1_end
	:pswitch_1_default
	invoke-virtual {p0, p1}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	.end packed-switch
	:pswitch_1_end

	return-void 
.end method

