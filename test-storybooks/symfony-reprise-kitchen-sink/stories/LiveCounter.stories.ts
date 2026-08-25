import type { Meta, StoryObj } from '@storybook/symfony';
import { expect, within } from 'storybook/test';

type LiveCounterArgs = {
  count?: number;
};

const meta = {
  title: 'Kitchen Sink/LiveCounter',
  component: 'LiveCounter',
  parameters: {
    symfony: {
      live: true,
    },
  },
} satisfies Meta<LiveCounterArgs>;

export default meta;
type Story = StoryObj<LiveCounterArgs>;

export const Default: Story = {
  args: {
    count: 0,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const count = canvas.getByText('0');

    await expect(count).toHaveClass('live-count');
  },
};
