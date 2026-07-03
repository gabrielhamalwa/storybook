import type { Meta, StoryObj } from '@storybook/symfony';

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
};
