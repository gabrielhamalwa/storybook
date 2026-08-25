import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Kitchen Sink/Live File Upload',
  component: 'LiveFileUpload',
  parameters: {
    symfony: {
      live: true,
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
