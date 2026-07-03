import type { Meta, StoryObj } from '@storybook/symfony';
import { expect, userEvent, within } from 'storybook/test';

type ButtonArgs = {
  label: string;
  variant?: 'primary' | 'secondary';
};

const meta = {
  title: 'Kitchen Sink/Button',
  component: 'Button',
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await expect(button).toHaveTextContent('Primary Button');
    await expect(button).toHaveClass('btn-primary');
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Clickable: Story = {
  args: {
    label: 'Click me',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);
    await expect(button).toHaveAttribute('data-clicked', 'true');
  },
};
