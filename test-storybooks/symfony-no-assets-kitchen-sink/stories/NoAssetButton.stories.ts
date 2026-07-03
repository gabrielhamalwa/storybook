import type { Meta, StoryObj } from '@storybook/symfony';

type NoAssetButtonArgs = {
  label: string;
};

const meta = {
  title: 'No Asset Pipeline/NoAssetButton',
  component: 'NoAssetButton',
} satisfies Meta<NoAssetButtonArgs>;

export default meta;
type Story = StoryObj<NoAssetButtonArgs>;

export const Default: Story = {
  args: {
    label: 'No Asset Button',
  },
};
