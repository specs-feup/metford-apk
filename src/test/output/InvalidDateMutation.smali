App: .class public LInvalidDateTest;
.super Ljava/lang/Object;

.method public static createDate()Ljava/util/Date;
	.locals 3

	sget v1, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
	add-int/lit16 v1, v1, -0x1
	packed-switch v1, :pswitch_1_data
	goto :pswitch_1_default
	:pswitch_1_0
	new-instance v0, Ljava/util/Date;
	const-wide/16 v1, 0x2710
	invoke-direct {v0, v1, v2}, Ljava/util/Date;-><init>(J)V
	goto :pswitch_1_end
	:pswitch_1_default
	new-instance v0, Ljava/util/Date;
	invoke-direct {v0}, Ljava/util/Date;-><init>()V
	:pswitch_1_data
	.packed-switch 0x0
	    :pswitch_1_0
	.end packed-switch
	:pswitch_1_end

	return-object v0
.end method

