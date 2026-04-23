App: .class public LFindViewByIdTest;
.super Ljava/lang/Object;

.method public static getView(Landroid/app/Activity;)Landroid/view/View;
	.locals 2

	const v0, 0x7f040001

	sget v1, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v1, v1, -0x1
	packed-switch v1, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	const/4 v0, 0x0
	goto :pswitch_1_end
	:pswitch_1_default
	invoke-virtual {p0, v0}, Landroid/app/Activity;->findViewById(I)Landroid/view/View;
	move-result-object v0
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	.end packed-switch
	:pswitch_1_end

	return-object v0
.end method

