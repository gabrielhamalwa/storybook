import { Source, Title } from '@storybook/addon-docs/blocks';
import type { Meta, StoryObj } from '@storybook/symfony';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

type ButtonArgs = {
  label: string;
  variant?: 'primary' | 'secondary';
};

const meta = {
  title: 'Kitchen Sink/Button',
  component: 'Button',
  parameters: {
    docs: {
      page: () => (
        <>
          <Title />
          <Source />
        </>
      ),
    },
  },
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await expect(button).toHaveTextContent(args.label);
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
