import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTHORITY_REGISTRY,
  evaluateSourceIntake,
  SOURCE_INTAKE_SCHEMA,
  SYNTHETIC_TEST_ONLY,
  type SourceIntakeReasonCode,
  type SourceIntakeOutcome
} from "./index";
import {
  SYNTHETIC_FIXTURE_BYTES,
  SYNTHETIC_FIXTURE_MANIFEST,
  SYNTHETIC_TEST_AUTHORITY
} from "./synthetic-fixtures";

const injectedAuthority = { authorityRegistry: [SYNTHETIC_TEST_AUTHORITY] } as const;
const outcomeKeys = [
  "status",
  "reasonCode",
  "disposition",
  "publishable",
  "payloadReleased",
  "downstreamUseAllowed"
].sort();
const sensitiveOutcomeKeys = ["manifest", "rawBytes", "payload", "content"];

function expectQuarantinedOutcome(
  result: SourceIntakeOutcome,
  status: SourceIntakeOutcome["status"],
  reasonCode: SourceIntakeReasonCode
): void {
  const surface = result as SourceIntakeOutcome & Record<string, unknown>;

  expect(surface.status).toBe(status);
  expect(surface.reasonCode).toBe(reasonCode);
  expect(surface.disposition).toBe("QUARANTINED");
  expect(surface.publishable).toBe(false);
  expect(surface.payloadReleased).toBe(false);
  expect(surface.downstreamUseAllowed).toBe(false);
  expect(Object.getPrototypeOf(surface)).toBeNull();
  expect(Object.keys(surface).sort()).toEqual(outcomeKeys);
  for (const key of sensitiveOutcomeKeys) {
    expect(key in surface).toBe(false);
  }
}

function intake(
  manifest: unknown = SYNTHETIC_FIXTURE_MANIFEST,
  rawBytes: unknown = SYNTHETIC_FIXTURE_BYTES,
  options: unknown = injectedAuthority
): SourceIntakeOutcome {
  return evaluateSourceIntake(manifest, rawBytes as Uint8Array, options as typeof injectedAuthority);
}

function withObjectPrototypeDescriptors<T>(
  descriptors: readonly (readonly [string, PropertyDescriptor])[],
  callback: () => T
): T {
  const previous = descriptors.map(([key]) => [key, Object.getOwnPropertyDescriptor(Object.prototype, key)] as const);

  try {
    for (const [key, descriptor] of descriptors) Object.defineProperty(Object.prototype, key, descriptor);
    return callback();
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(Object.prototype, key);
      } else {
        Object.defineProperty(Object.prototype, key, descriptor);
      }
    }
  }
}

describe("synthetic source intake quarantine gate", () => {
  it("keeps complete synthetic evidence verified but nonpublishable", () => {
    expectQuarantinedOutcome(intake(), "VERIFIED", "VERIFIED_SYNTHETIC_EVIDENCE");
  });

  it("uses an empty default authority registry and reports unknown authority", () => {
    expect(DEFAULT_AUTHORITY_REGISTRY).toEqual([]);
    expectQuarantinedOutcome(intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, {}), "UNVERIFIED", "UNKNOWN_AUTHORITY");
  });

  it("reports missing provenance", () => {
    const manifest = { ...SYNTHETIC_FIXTURE_MANIFEST, provenance: undefined };
    expectQuarantinedOutcome(intake(manifest), "UNVERIFIED", "MISSING_PROVENANCE");
  });

  it("reports missing RA approval", () => {
    const { raEvidence: _raEvidence, ...manifest } = SYNTHETIC_FIXTURE_MANIFEST;
    expectQuarantinedOutcome(intake(manifest), "PENDING_RA_REVIEW", "MISSING_RA_APPROVAL");
  });

  it("rejects malformed raw bytes", () => {
    expectQuarantinedOutcome(intake(SYNTHETIC_FIXTURE_MANIFEST, null), "REJECTED", "MALFORMED_BYTES");
  });

  it("rejects raw-byte hash mismatches", () => {
    const tamperedBytes = new TextEncoder().encode("synthetic-fixture-tampered-v1");
    expectQuarantinedOutcome(intake(SYNTHETIC_FIXTURE_MANIFEST, tamperedBytes), "REJECTED", "HASH_MISMATCH");
  });

  it("does not trust an authority that was not injected", () => {
    const manifest = { ...SYNTHETIC_FIXTURE_MANIFEST, authorityId: "synthetic-test-authority-unknown" };
    expectQuarantinedOutcome(intake(manifest), "UNVERIFIED", "UNKNOWN_AUTHORITY");
  });

  it("rejects RA evidence that explicitly declines the source", () => {
    const manifest = {
      ...SYNTHETIC_FIXTURE_MANIFEST,
      raEvidence: { ...SYNTHETIC_FIXTURE_MANIFEST.raEvidence, decision: "REJECTED" as const }
    };
    expectQuarantinedOutcome(intake(manifest), "REJECTED", "RA_REJECTED");
  });

  it("rejects malformed manifests", () => {
    expectQuarantinedOutcome(intake({ schema: "wrong" }), "REJECTED", "MALFORMED_MANIFEST");
  });

  it("rejects malformed SHA-256 declarations", () => {
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, declaredSha256: "not-a-sha256" }),
      "REJECTED",
      "MALFORMED_DIGEST"
    );
  });

  it("fails closed for malformed source reference and retrieval metadata", () => {
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, provenance: { ...SYNTHETIC_FIXTURE_MANIFEST.provenance, sourceReference: "" } }),
      "UNVERIFIED",
      "MISSING_PROVENANCE"
    );
    expectQuarantinedOutcome(
      intake({
        ...SYNTHETIC_FIXTURE_MANIFEST,
        provenance: { ...SYNTHETIC_FIXTURE_MANIFEST.provenance, retrieval: { method: "other" } }
      }),
      "UNVERIFIED",
      "MISSING_PROVENANCE"
    );
  });

  it("fails closed for malformed RA evidence", () => {
    expectQuarantinedOutcome(
      intake({
        ...SYNTHETIC_FIXTURE_MANIFEST,
        raEvidence: { ...SYNTHETIC_FIXTURE_MANIFEST.raEvidence, reviewerId: "" }
      }),
      "PENDING_RA_REVIEW",
      "MISSING_RA_APPROVAL"
    );
  });

  it("rejects a registry entry with a non-synthetic classification", () => {
    const options = { authorityRegistry: [{ ...SYNTHETIC_TEST_AUTHORITY, classification: "WRONG" }] };
    expectQuarantinedOutcome(intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, options), "UNVERIFIED", "UNKNOWN_AUTHORITY");
  });

  it("rejects wrong manifest schema and classification", () => {
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, schema: "source-intake/v2" }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, classification: "NOT_SYNTHETIC" }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("rejects extra enumerable manifest fields", () => {
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, unexpected: "not-accepted" }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("rejects inherited required manifest fields", () => {
    const inherited = Object.create(SYNTHETIC_FIXTURE_MANIFEST) as Record<string, unknown>;
    expectQuarantinedOutcome(intake(inherited), "REJECTED", "MALFORMED_MANIFEST");
  });

  it("rejects custom manifest prototypes", () => {
    const customPrototype = Object.assign(Object.create({}), SYNTHETIC_FIXTURE_MANIFEST);
    expectQuarantinedOutcome(intake(customPrototype), "REJECTED", "MALFORMED_MANIFEST");
  });

  it("rejects non-enumerable manifest fields", () => {
    const nonEnumerable = { ...SYNTHETIC_FIXTURE_MANIFEST };
    Object.defineProperty(nonEnumerable, "schema", { enumerable: false, value: SOURCE_INTAKE_SCHEMA });
    expectQuarantinedOutcome(intake(nonEnumerable), "REJECTED", "MALFORMED_MANIFEST");
  });

  it("rejects symbol manifest fields", () => {
    const symbolField = { ...SYNTHETIC_FIXTURE_MANIFEST, [Symbol("unexpected")]: true };
    expectQuarantinedOutcome(intake(symbolField), "REJECTED", "MALFORMED_MANIFEST");
  });

  it("rejects accessors without executing their getters", () => {
    let getterRead = false;
    const accessor = { ...SYNTHETIC_FIXTURE_MANIFEST };
    Object.defineProperty(accessor, "schema", {
      enumerable: true,
      get() {
        getterRead = true;
        return SOURCE_INTAKE_SCHEMA;
      }
    });

    expectQuarantinedOutcome(intake(accessor), "REJECTED", "MALFORMED_MANIFEST");
    expect(getterRead).toBe(false);
  });

  it("rejects transparent proxies", () => {
    expectQuarantinedOutcome(
      intake(new Proxy({ ...SYNTHETIC_FIXTURE_MANIFEST }, {})),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("rejects throwing proxies without throwing", () => {
    const throwingProxy = new Proxy({ ...SYNTHETIC_FIXTURE_MANIFEST }, { ownKeys: () => { throw new Error("trap"); } });
    let result: SourceIntakeOutcome | undefined;

    expect(() => {
      result = intake(throwingProxy);
    }).not.toThrow();
    expectQuarantinedOutcome(result as SourceIntakeOutcome, "REJECTED", "MALFORMED_MANIFEST");
  });

  it("uses a deterministic fail-closed order for mixed failures", () => {
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, declaredSha256: "bad", provenance: undefined }),
      "REJECTED",
      "MALFORMED_DIGEST"
    );
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, schema: "wrong" }, null),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, new TextEncoder().encode("tampered"), {}),
      "REJECTED",
      "HASH_MISMATCH"
    );
  });

  it("keeps missing RA pending when Object.prototype supplies an approved value", () => {
    const { raEvidence: _raEvidence, ...missingRaManifest } = SYNTHETIC_FIXTURE_MANIFEST;
    let result: SourceIntakeOutcome | undefined;

    withObjectPrototypeDescriptors(
      [["raEvidence", { configurable: true, enumerable: true, value: SYNTHETIC_FIXTURE_MANIFEST.raEvidence }]],
      () => {
        result = intake(missingRaManifest);
      }
    );
    expectQuarantinedOutcome(result as SourceIntakeOutcome, "PENDING_RA_REVIEW", "MISSING_RA_APPROVAL");
  });

  it("never invokes a polluted Object.prototype RA getter", () => {
    const { raEvidence: _raEvidence, ...missingRaManifest } = SYNTHETIC_FIXTURE_MANIFEST;
    let getterCalls = 0;
    let result: SourceIntakeOutcome | undefined;
    let thrown: unknown;

    try {
      withObjectPrototypeDescriptors(
        [["raEvidence", {
          configurable: true,
          enumerable: true,
          get() {
            getterCalls += 1;
            throw new Error("prototype getter must not run");
          }
        }]],
        () => {
          result = intake(missingRaManifest);
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeUndefined();
    expect(getterCalls).toBe(0);
    expectQuarantinedOutcome(result as SourceIntakeOutcome, "PENDING_RA_REVIEW", "MISSING_RA_APPROVAL");
  });

  it("keeps every outcome null-prototype and without polluted sensitive surface", () => {
    const { raEvidence: _raEvidence, ...missingRaManifest } = SYNTHETIC_FIXTURE_MANIFEST;
    const pollutedDescriptors: readonly (readonly [string, PropertyDescriptor])[] = [
      ["manifest", { configurable: true, enumerable: true, value: "polluted" }],
      ["rawBytes", { configurable: true, enumerable: true, value: "polluted" }],
      ["payload", { configurable: true, enumerable: true, value: "polluted" }],
      ["content", { configurable: true, enumerable: true, value: "polluted" }],
      ["raEvidence", { configurable: true, enumerable: true, value: SYNTHETIC_FIXTURE_MANIFEST.raEvidence }]
    ];

    let cases: readonly (readonly [SourceIntakeOutcome, SourceIntakeOutcome["status"], SourceIntakeReasonCode])[] = [];
    let pollutedSurfaceChecks: readonly (readonly [object | null, readonly string[], readonly boolean[]])[] = [];
    withObjectPrototypeDescriptors(pollutedDescriptors, () => {
      cases = [
        [intake(), "VERIFIED", "VERIFIED_SYNTHETIC_EVIDENCE"],
        [intake({ schema: "wrong" }), "REJECTED", "MALFORMED_MANIFEST"],
        [intake({ ...SYNTHETIC_FIXTURE_MANIFEST, declaredSha256: "bad" }), "REJECTED", "MALFORMED_DIGEST"],
        [intake(SYNTHETIC_FIXTURE_MANIFEST, null), "REJECTED", "MALFORMED_BYTES"],
        [intake(SYNTHETIC_FIXTURE_MANIFEST, new TextEncoder().encode("tampered")), "REJECTED", "HASH_MISMATCH"],
        [intake({ ...SYNTHETIC_FIXTURE_MANIFEST, provenance: undefined }), "UNVERIFIED", "MISSING_PROVENANCE"],
        [intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, {}), "UNVERIFIED", "UNKNOWN_AUTHORITY"],
        [intake(missingRaManifest), "PENDING_RA_REVIEW", "MISSING_RA_APPROVAL"],
        [intake({ ...SYNTHETIC_FIXTURE_MANIFEST, raEvidence: { ...SYNTHETIC_FIXTURE_MANIFEST.raEvidence, decision: "REJECTED" } }), "REJECTED", "RA_REJECTED"]
      ];
      pollutedSurfaceChecks = cases.map(([result]) => [
        Object.getPrototypeOf(result),
        Object.keys(result).sort(),
        sensitiveOutcomeKeys.map((key) => key in result)
      ]);
    });
    for (const [result, status, reasonCode] of cases) expectQuarantinedOutcome(result, status, reasonCode);
    for (const [prototype, keys, sensitiveVisibility] of pollutedSurfaceChecks) {
      expect(prototype).toBeNull();
      expect(keys).toEqual(outcomeKeys);
      expect(sensitiveVisibility).toEqual([false, false, false, false]);
    }
  });

  it("keeps normalized manifest, provenance, retrieval, and RA data independent of Object.prototype", () => {
    let getterCalls = 0;
    const getterDescriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("prototype getter must not run");
      }
    };
    let result: SourceIntakeOutcome | undefined;
    let thrown: unknown;

    try {
      withObjectPrototypeDescriptors(
        [
          ["raEvidence", getterDescriptor],
          ["sourceReference", getterDescriptor],
          ["retrieval", getterDescriptor],
          ["method", getterDescriptor],
          ["reviewerId", getterDescriptor]
        ],
        () => {
          result = intake();
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeUndefined();
    expect(getterCalls).toBe(0);
    expectQuarantinedOutcome(result as SourceIntakeOutcome, "VERIFIED", "VERIFIED_SYNTHETIC_EVIDENCE");
  });

  it("rejects transparent proxies at every nested intake boundary", () => {
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, provenance: new Proxy({ ...SYNTHETIC_FIXTURE_MANIFEST.provenance }, {}) }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(
      intake({
        ...SYNTHETIC_FIXTURE_MANIFEST,
        provenance: {
          ...SYNTHETIC_FIXTURE_MANIFEST.provenance,
          retrieval: new Proxy({ ...SYNTHETIC_FIXTURE_MANIFEST.provenance.retrieval }, {})
        }
      }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, raEvidence: new Proxy({ ...SYNTHETIC_FIXTURE_MANIFEST.raEvidence }, {}) }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, new Proxy(injectedAuthority, {})), "REJECTED", "MALFORMED_MANIFEST");
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: new Proxy([SYNTHETIC_TEST_AUTHORITY], {}) }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: [new Proxy({ ...SYNTHETIC_TEST_AUTHORITY }, {})] }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("rejects throwing proxies at every nested intake boundary without throwing", () => {
    const throwing = <T extends object>(value: T): T => new Proxy(value, { ownKeys: () => { throw new Error("trap"); } });
    const cases: readonly (readonly [unknown, unknown])[] = [
      [{ ...SYNTHETIC_FIXTURE_MANIFEST, provenance: throwing({ ...SYNTHETIC_FIXTURE_MANIFEST.provenance }) }, injectedAuthority],
      [{ ...SYNTHETIC_FIXTURE_MANIFEST, provenance: { ...SYNTHETIC_FIXTURE_MANIFEST.provenance, retrieval: throwing({ ...SYNTHETIC_FIXTURE_MANIFEST.provenance.retrieval }) } }, injectedAuthority],
      [{ ...SYNTHETIC_FIXTURE_MANIFEST, raEvidence: throwing({ ...SYNTHETIC_FIXTURE_MANIFEST.raEvidence }) }, injectedAuthority],
      [SYNTHETIC_FIXTURE_MANIFEST, throwing(injectedAuthority)],
      [SYNTHETIC_FIXTURE_MANIFEST, { authorityRegistry: throwing([SYNTHETIC_TEST_AUTHORITY]) }],
      [SYNTHETIC_FIXTURE_MANIFEST, { authorityRegistry: [throwing({ ...SYNTHETIC_TEST_AUTHORITY })] }]
    ];

    for (const [manifest, options] of cases) {
      let result: SourceIntakeOutcome | undefined;
      expect(() => {
        result = intake(manifest, SYNTHETIC_FIXTURE_BYTES, options);
      }).not.toThrow();
      expectQuarantinedOutcome(result as SourceIntakeOutcome, "REJECTED", "MALFORMED_MANIFEST");
    }
  });

  it("rejects nested accessors without executing them", () => {
    let getterCalls = 0;
    const accessorDescriptor = (): PropertyDescriptor => ({
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return "not-read";
      }
    });
    const provenance = { ...SYNTHETIC_FIXTURE_MANIFEST.provenance };
    Object.defineProperty(provenance, "sourceReference", accessorDescriptor());
    const retrieval = { ...SYNTHETIC_FIXTURE_MANIFEST.provenance.retrieval };
    Object.defineProperty(retrieval, "method", accessorDescriptor());
    const raEvidence = { ...SYNTHETIC_FIXTURE_MANIFEST.raEvidence };
    Object.defineProperty(raEvidence, "decision", accessorDescriptor());
    const options = { authorityRegistry: [SYNTHETIC_TEST_AUTHORITY] };
    Object.defineProperty(options, "authorityRegistry", accessorDescriptor());
    const authorityEntry = { ...SYNTHETIC_TEST_AUTHORITY };
    Object.defineProperty(authorityEntry, "classification", accessorDescriptor());

    expectQuarantinedOutcome(intake({ ...SYNTHETIC_FIXTURE_MANIFEST, provenance }), "REJECTED", "MALFORMED_MANIFEST");
    expectQuarantinedOutcome(
      intake({ ...SYNTHETIC_FIXTURE_MANIFEST, provenance: { ...SYNTHETIC_FIXTURE_MANIFEST.provenance, retrieval } }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(intake({ ...SYNTHETIC_FIXTURE_MANIFEST, raEvidence }), "REJECTED", "MALFORMED_MANIFEST");
    expectQuarantinedOutcome(intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, options), "REJECTED", "MALFORMED_MANIFEST");
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: [authorityEntry] }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expect(getterCalls).toBe(0);
  });

  it("validates every registry entry after an early matching authority", () => {
    const malformedEntry = { id: "synthetic-test-authority-after-match" };
    const accessorEntry = { ...SYNTHETIC_TEST_AUTHORITY };
    let getterCalls = 0;
    Object.defineProperty(accessorEntry, "classification", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return SYNTHETIC_TEST_ONLY;
      }
    });
    const transparentProxyEntry = new Proxy({ ...SYNTHETIC_TEST_AUTHORITY }, {});
    const throwingProxyEntry = new Proxy({ ...SYNTHETIC_TEST_AUTHORITY }, { ownKeys: () => { throw new Error("trap"); } });

    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: [SYNTHETIC_TEST_AUTHORITY, malformedEntry] }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: [SYNTHETIC_TEST_AUTHORITY, accessorEntry] }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expect(getterCalls).toBe(0);
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: [SYNTHETIC_TEST_AUTHORITY, transparentProxyEntry] }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    let throwingResult: SourceIntakeOutcome | undefined;
    expect(() => {
      throwingResult = intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, {
        authorityRegistry: [SYNTHETIC_TEST_AUTHORITY, throwingProxyEntry]
      });
    }).not.toThrow();
    expectQuarantinedOutcome(throwingResult as SourceIntakeOutcome, "REJECTED", "MALFORMED_MANIFEST");
  });

  it("does not verify a matching authority when a later entry is semantically invalid", () => {
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, {
        authorityRegistry: [SYNTHETIC_TEST_AUTHORITY, { id: "synthetic-test-authority-after-match", classification: "WRONG" }]
      }),
      "UNVERIFIED",
      "UNKNOWN_AUTHORITY"
    );
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, {
        authorityRegistry: [SYNTHETIC_TEST_AUTHORITY, { id: "", classification: SYNTHETIC_TEST_ONLY }]
      }),
      "UNVERIFIED",
      "UNKNOWN_AUTHORITY"
    );
  });

  it("gives a later structural malformed entry priority over earlier semantic invalidity", () => {
    const accessorEntry = { ...SYNTHETIC_TEST_AUTHORITY };
    let getterCalls = 0;
    Object.defineProperty(accessorEntry, "classification", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return SYNTHETIC_TEST_ONLY;
      }
    });
    const transparentProxyEntry = new Proxy({ ...SYNTHETIC_TEST_AUTHORITY }, {});
    const throwingProxyEntry = new Proxy({ ...SYNTHETIC_TEST_AUTHORITY }, { ownKeys: () => { throw new Error("trap"); } });
    const revocable = Proxy.revocable({ ...SYNTHETIC_TEST_AUTHORITY }, {});
    revocable.revoke();
    const registries: readonly (readonly unknown[])[] = [
      [SYNTHETIC_TEST_AUTHORITY, { id: "synthetic-after-match", classification: "WRONG" }, accessorEntry],
      [SYNTHETIC_TEST_AUTHORITY, { id: "", classification: SYNTHETIC_TEST_ONLY }, transparentProxyEntry],
      [SYNTHETIC_TEST_AUTHORITY, { id: "synthetic-after-match", classification: "WRONG" }, throwingProxyEntry],
      [SYNTHETIC_TEST_AUTHORITY, { id: "", classification: SYNTHETIC_TEST_ONLY }, revocable.proxy]
    ];

    for (const authorityRegistry of registries) {
      let result: SourceIntakeOutcome | undefined;
      expect(() => {
        result = intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry });
      }).not.toThrow();
      expectQuarantinedOutcome(result as SourceIntakeOutcome, "REJECTED", "MALFORMED_MANIFEST");
    }
    expect(getterCalls).toBe(0);
  });

  it("returns unknown for semantic invalidity alone at every registry position", () => {
    const validBefore = { id: "synthetic-before", classification: SYNTHETIC_TEST_ONLY } as const;
    const validAfter = { id: "synthetic-after", classification: SYNTHETIC_TEST_ONLY } as const;
    const semanticInvalid = { id: "", classification: SYNTHETIC_TEST_ONLY } as const;
    const registries = [
      [semanticInvalid],
      [semanticInvalid, validAfter],
      [validBefore, semanticInvalid, validAfter],
      [validBefore, semanticInvalid]
    ];

    for (const authorityRegistry of registries) {
      expectQuarantinedOutcome(
        intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry }),
        "UNVERIFIED",
        "UNKNOWN_AUTHORITY"
      );
    }
  });

  it("gives structural malformed entries priority at the front, middle, and tail", () => {
    const validBefore = { id: "synthetic-before", classification: SYNTHETIC_TEST_ONLY } as const;
    const malformed = { id: "synthetic-malformed" };
    const registries = [
      [malformed, SYNTHETIC_TEST_AUTHORITY],
      [validBefore, malformed, SYNTHETIC_TEST_AUTHORITY],
      [validBefore, SYNTHETIC_TEST_AUTHORITY, malformed]
    ];

    for (const authorityRegistry of registries) {
      expectQuarantinedOutcome(
        intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry }),
        "REJECTED",
        "MALFORMED_MANIFEST"
      );
    }
  });

  it("accepts only a complete, standard-prototype registry and recognizes a match at any position", () => {
    const precedingAuthority = { id: "synthetic-test-authority-before", classification: SYNTHETIC_TEST_ONLY } as const;
    const followingAuthority = { id: "synthetic-test-authority-after", classification: SYNTHETIC_TEST_ONLY } as const;
    const validRegistries = [
      [SYNTHETIC_TEST_AUTHORITY, followingAuthority],
      [precedingAuthority, SYNTHETIC_TEST_AUTHORITY, followingAuthority],
      [precedingAuthority, followingAuthority, SYNTHETIC_TEST_AUTHORITY]
    ];

    for (const authorityRegistry of validRegistries) {
      expectQuarantinedOutcome(
        intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry }),
        "VERIFIED",
        "VERIFIED_SYNTHETIC_EVIDENCE"
      );
    }

    const customPrototypeRegistry = [SYNTHETIC_TEST_AUTHORITY];
    Object.setPrototypeOf(customPrototypeRegistry, Object.create(Array.prototype));
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: customPrototypeRegistry }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );

    const nullPrototypeRegistry = [SYNTHETIC_TEST_AUTHORITY];
    Object.setPrototypeOf(nullPrototypeRegistry, null);
    expectQuarantinedOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES, { authorityRegistry: nullPrototypeRegistry }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("keeps fixture fields free of drug-code, price, patient, and official-authority identifiers", () => {
    const fixtureSurface = JSON.stringify({
      manifest: SYNTHETIC_FIXTURE_MANIFEST,
      bytes: new TextDecoder().decode(SYNTHETIC_FIXTURE_BYTES)
    });

    expect(fixtureSurface).not.toMatch(/\b[A-Z][0-9]{9}\b/);
    expect(fixtureSurface).not.toMatch(/(?:price|patient|病人)/iu);
    expect(fixtureSurface).not.toMatch(/(?:National Health Insurance Administration|健保署|衛生福利部中央健康保險署)/u);
    expect(SYNTHETIC_FIXTURE_MANIFEST.classification).toBe(SYNTHETIC_TEST_ONLY);
  });
});
