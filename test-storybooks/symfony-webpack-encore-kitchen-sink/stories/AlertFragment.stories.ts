import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Kitchen Sink/Alert Fragment',
  component: 'AlertFragment',
  parameters: {
    symfony: {
      adapter: 'controller',
      controller: 'App\\Controller\\AlertController::fragment',
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Controller fragment alert',
  },
};
