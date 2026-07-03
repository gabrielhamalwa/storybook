import type { Meta, StoryObj } from '@storybook/symfony';
import { expect, within } from 'storybook/test';

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await expect(button).toHaveTextContent('No Asset Button');
  },
};
