/**
 * Per-variant attribution — each schemata site can hold variants contributed by
 * multiple operators, so the operator that produced a variant is recorded per
 * variant rather than per site.
 */
export interface VariantRecord {
    code: string;
    operator: string;
}

export interface MutationRecord {
    siteTag: string;
    method: string;
    original: string;
    variants: VariantRecord[];
}

export class MutationEngine {
    private _nextId = 1;
    private _nextSiteTag = 1;
    readonly records: MutationRecord[] = [];

    allocate(numVariants: number): { baseId: number; siteTag: string } {
        const baseId = this._nextId;
        const siteTag = String(this._nextSiteTag++);
        this._nextId += numVariants;
        return { baseId, siteTag };
    }

    record(siteTag: string, method: string, original: string, variants: VariantRecord[]) {
        this.records.push({ siteTag, method, original, variants });
    }
}
