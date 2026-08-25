import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Kitchen Sink/AutoDocs',
  component: 'AutoDocs',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Autodocs generated this page',
  },
};
