import { describe, expect, it } from 'vitest';
import { fetchLatestRelease, isNewer, parseVersion, updateStatus } from './updates';
import { version } from '../package.json';

const respond = (status, body) => async () => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body
});

describe('parseVersion', () => {
  it('reads plain and v-prefixed versions', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('v0.10.0')).toEqual([0, 10, 0]);
  });

  it('rejects pre-releases and anything else', () => {
    expect(parseVersion('1.2.3-beta')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
  });
});

describe('isNewer', () => {
  it('compares each part as a number', () => {
    expect(isNewer('0.10.0', '0.9.9')).toBe(true);
    expect(isNewer('1.0.0', '0.99.99')).toBe(true);
    expect(isNewer('0.2.1', '0.2.0')).toBe(true);
  });

  it('is false for the same or an older version', () => {
    expect(isNewer('0.2.0', '0.2.0')).toBe(false);
    expect(isNewer('v0.1.9', '0.2.0')).toBe(false);
  });

  it('is false when either version is unreadable', () => {
    expect(isNewer('nightly', '0.1.0')).toBe(false);
    expect(isNewer('2.0.0-rc1', '0.1.0')).toBe(false);
  });
});

describe('fetchLatestRelease', () => {
  it('returns the version (without the v) and the release page', async () => {
    const latest = await fetchLatestRelease(
      respond(200, { tag_name: 'v1.4.0', html_url: 'https://github.com/x/y/releases/tag/v1.4.0' })
    );
    expect(latest).toEqual({ version: '1.4.0', url: 'https://github.com/x/y/releases/tag/v1.4.0' });
  });

  it('returns null when nothing is published yet', async () => {
    expect(await fetchLatestRelease(respond(404, { message: 'Not Found' }))).toBeNull();
  });

  it('fails on other errors (rate limit, server error)', async () => {
    await expect(fetchLatestRelease(respond(403, {}))).rejects.toThrow('403');
  });
});

describe('updateStatus', () => {
  it('offers only a newer version than this one', () => {
    expect(updateStatus({ version: '999.0.0' })).toBe('available');
    expect(updateStatus({ version })).toBe('current');
    expect(updateStatus(null)).toBe('current');
  });
});
