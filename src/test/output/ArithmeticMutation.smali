App: .class public LArithmeticTest;
.super Ljava/lang/Object;

.method public static add(II)I
	.locals 2

	sget v1, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v1, v1, -0x1
	packed-switch v1, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	sub-int v0, p0, p1
	goto :pswitch_1_end
	:pswitch_1_1
	mul-int v0, p0, p1
	goto :pswitch_1_end
	:pswitch_1_default
	add-int v0, p0, p1
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	    :pswitch_1_1
	.end packed-switch
	:pswitch_1_end

	return v0
.end method

