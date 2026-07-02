import type { Meta, StoryObj } from '@storybook/symfony';

type ButtonArgs = {
  label: string;
  variant?: 'primary' | 'secondary';
};

const meta = {
  title: 'Example/Button',
  component: 'Button',
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'secondary',
  },
};
