// TODO: Remove this compatibility redirect after 1-2 deploys
import { redirect } from 'next/navigation';

export default function V2Redirect() {
  redirect('/');
}
