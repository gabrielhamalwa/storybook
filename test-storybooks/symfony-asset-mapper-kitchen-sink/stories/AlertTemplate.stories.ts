import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Kitchen Sink/Alert Template',
  component: 'AlertTemplate',
  parameters: {
    symfony: {
      adapter: 'template',
      template: 'templates/components/Alert.html.twig',
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Plain Twig template alert',
    type: 'info',
  },
};
