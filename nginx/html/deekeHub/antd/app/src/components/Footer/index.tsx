import { DefaultFooter } from '@ant-design/pro-components';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const siteTitle = document.title.split(' - ').pop() || document.title;
  return (
    <DefaultFooter
      copyright={`${currentYear} ${siteTitle}`}
    />
  );
};
export default Footer;
