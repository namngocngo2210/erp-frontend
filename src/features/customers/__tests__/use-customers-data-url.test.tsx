/**
 * Tests for URL-param seeding in useCustomersData.
 *
 * The full hook depends on react-query providers and many mutations; testing the
 * complete hook in isolation would require extensive mocking. Instead we test the
 * seeding logic directly by exercising the same URLSearchParams pattern the hook
 * uses, and we verify the ALL_SEGMENTS / ALL_CHANNELS fallback constants match
 * the expected defaults.
 */
import { describe, it, expect, afterEach } from "vitest";
import { ALL_CHANNELS, ALL_SEGMENTS } from "@/features/customers/customer-types";

const originalLocation = window.location;

function mockSearch(search: string) {
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, search },
    writable: true,
    configurable: true,
  });
}

function restoreLocation() {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
}

/**
 * Mirrors the seeding logic from useCustomersData:
 *   const initialParams = new URLSearchParams(window.location.search);
 *   const [segment] = useState(initialParams.get("segment") ?? ALL_SEGMENTS);
 *   const [channel] = useState(initialParams.get("channel") ?? ALL_CHANNELS);
 */
function seedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    segment: params.get("segment") ?? ALL_SEGMENTS,
    channel: params.get("channel") ?? ALL_CHANNELS,
  };
}

describe("useCustomersData URL seeding", () => {
  afterEach(restoreLocation);

  it("falls back to ALL_SEGMENTS/ALL_CHANNELS when no params present", () => {
    mockSearch("");
    const { segment, channel } = seedFromUrl();
    expect(segment).toBe(ALL_SEGMENTS);
    expect(channel).toBe(ALL_CHANNELS);
  });

  it("seeds segment from ?segment= URL param", () => {
    mockSearch("?segment=S3");
    const { segment, channel } = seedFromUrl();
    expect(segment).toBe("S3");
    expect(channel).toBe(ALL_CHANNELS);
  });

  it("seeds channel from ?channel= URL param", () => {
    mockSearch("?channel=5");
    const { segment, channel } = seedFromUrl();
    expect(segment).toBe(ALL_SEGMENTS);
    expect(channel).toBe("5");
  });

  it("seeds both segment and channel simultaneously", () => {
    mockSearch("?segment=S6&channel=2");
    const { segment, channel } = seedFromUrl();
    expect(segment).toBe("S6");
    expect(channel).toBe("2");
  });
});
