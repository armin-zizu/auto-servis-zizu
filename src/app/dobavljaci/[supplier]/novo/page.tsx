import SupplierPaymentPage from '@/app/dobavljaci/SupplierPaymentPage';

export default async function SupplierNovoPage({
  params,
}: {
  params: Promise<{ supplier: string }>;
}) {
  const { supplier } = await params;
  return <SupplierPaymentPage supplierSlugValue={supplier} />;
}
