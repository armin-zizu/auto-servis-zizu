import SupplierAccountPage from '@/app/dobavljaci/SupplierAccountPage';

export default async function SupplierPage({ params }: { params: Promise<{ supplier: string }> }) {
  const { supplier } = await params;
  return <SupplierAccountPage supplierSlugValue={supplier} />;
}
