import { CardGridBlock } from './CardGridBlock';
import { HeroBlock } from './HeroBlock';
import { MailLinkBlock } from './MailLinkBlock';
import { ParagraphBlock } from './ParagraphBlock';
import { PostListBlock } from './PostListBlock';
import { PostMetaBlock } from './PostMetaBlock';

type Props = {
  block: {
    type: string;
    props?: Record<string, unknown>;
  };
};

export function BlockRenderer({ block }: Props) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock props={block.props} />;

    case 'paragraph':
      return <ParagraphBlock props={block.props} />;

    case 'mail_link':
      return <MailLinkBlock props={block.props} />;

    case 'card_grid':
      return <CardGridBlock props={block.props} />;

    case 'post_list':
      return <PostListBlock props={block.props} />;

    case 'post_meta':
      return <PostMetaBlock props={block.props} />;

    default:
      return null;
  }
}
