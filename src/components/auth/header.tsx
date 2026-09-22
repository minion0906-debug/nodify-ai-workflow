import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";

export default function AuthHeader() {
    return (
        <header className="p-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                <Image src="/assets/images/icon.png" alt="Nodify Logo" width={58} height={58} className="h-7 w-7" />
                Nodify
            </Link>
            <nav className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                    <Link href="/register">Sign Up</Link>
                </Button>
            </nav>
        </header>
    )
}
