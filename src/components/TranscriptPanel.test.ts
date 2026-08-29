import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { TranscriptSegment } from '@/utils/transcript';
import TranscriptPanel from './TranscriptPanel.vue';

const segments: TranscriptSegment[] = [
  { start: 0, dur: 2, text: 'Welcome to the video' },
  { start: 62, dur: 3, text: 'Today we talk about cooking' },
  { start: 125, dur: 4, text: 'Let\'s start with the ingredients' },
];

const panel = (props: Partial<InstanceType<typeof TranscriptPanel>['$props']> = {}) =>
  mount(TranscriptPanel, {
    props: { segments, currentTime: 0, status: 'ok', ...props },
  });

describe('TranscriptPanel', () => {
  it('shows one line per segment with its timestamp', () => {
    const rows = panel().findAll('.transcript-line');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.text()).toContain('1:02');
    expect(rows[1]!.text()).toContain('Today we talk about cooking');
  });

  it('emits the start of the line that was clicked', async () => {
    const wrapper = panel();

    await wrapper.findAll('.transcript-line')[2]!.trigger('click');

    expect(wrapper.emitted('seek')).toEqual([[125]]);
  });

  it('marks the line playing right now', () => {
    const rows = panel({ currentTime: 70 }).findAll('.transcript-line');

    expect(rows[1]!.classes()).toContain('active');
    expect(rows[0]!.classes()).not.toContain('active');
    expect(rows[1]!.attributes('aria-current')).toBe('true');
    expect(rows[0]!.attributes('aria-current')).toBeUndefined();
  });

  it('marks only one line when two cues share the same start', () => {
    // Two cues at the same instant is normal in real subtitles; keying the rows on `start`
    // made Vue see one key twice and lit both rows up.
    const twins: TranscriptSegment[] = [
      { start: 0, dur: 2, text: 'first line' },
      { start: 10, dur: 2, text: 'a speaker' },
      { start: 10, dur: 2, text: 'and another at the same instant' },
      { start: 20, dur: 2, text: 'later line' },
    ];
    const rows = panel({ segments: twins, currentTime: 12 }).findAll('.transcript-line');

    expect(rows).toHaveLength(4);
    expect(rows.filter(row => row.classes().includes('active'))).toHaveLength(1);
    expect(rows[2]!.classes()).toContain('active');
  });

  it('labels the search box for a screen reader rather than relying on the placeholder', () => {
    const input = panel().find('.transcript-search input');

    expect(input.attributes('aria-label')).toBe('Search the transcript...');
  });

  it('announces the waiting and failing states through a live region', () => {
    const message = panel({ segments: [], status: 'error' }).find('.no-data');

    expect(message.attributes('aria-live')).toBe('polite');
    expect(message.attributes('role')).toBe('status');
  });

  it('filters the lines by the search box', async () => {
    const wrapper = panel();

    await wrapper.find('.transcript-search input').setValue('cooking');

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
  });

  it('says so when the search matches nothing', async () => {
    const wrapper = panel();

    await wrapper.find('.transcript-search input').setValue('spaceships');

    expect(wrapper.findAll('.transcript-line')).toHaveLength(0);
    expect(wrapper.text()).toContain('No matches');
  });

  it('copies the text without timestamps', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = panel();

    await wrapper.find('.transcript-copy').trigger('click');

    expect(writeText).toHaveBeenCalledWith(
      'Welcome to the video\nToday we talk about cooking\nLet\'s start with the ingredients',
    );
    // The button confirms the copy, which is also what makes the refusal test below mean
    // something: the label does move, so finding it unmoved is evidence.
    await flushPromises();
    expect(wrapper.find('.transcript-copy').text()).toBe('Copied');
    vi.unstubAllGlobals();
  });

  it('survives a browser that refuses the clipboard', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const wrapper = panel();
    const button = wrapper.find('.transcript-copy');
    expect(button.text()).toBe('Copy');

    await button.trigger('click');
    await flushPromises();

    // Still usable and still offering to copy, rather than stuck on a confirmation it never earned.
    expect(wrapper.find('.transcript-copy').text()).toBe('Copy');
    expect(wrapper.findAll('.transcript-line')).toHaveLength(3);
    vi.unstubAllGlobals();
  });

  it('offers neither search nor copy when there is no transcript', () => {
    const wrapper = panel({ segments: [], status: 'empty' });

    expect(wrapper.text()).toContain('No transcript available');
    expect(wrapper.find('.transcript-copy').exists()).toBe(false);
    expect(wrapper.find('.transcript-search').exists()).toBe(false);
  });

  it('gives each waiting or failing state its own message', () => {
    expect(panel({ segments: [], status: 'loading' }).text()).toContain('Loading transcript');
    expect(panel({ segments: [], status: 'pending' }).text()).toContain('Preparing transcript');
    expect(panel({ segments: [], status: 'quota' }).text()).toContain('Monthly limit');
    expect(panel({ segments: [], status: 'error' }).text()).toContain('Could not load');
  });
});
