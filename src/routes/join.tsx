import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSetPageNav } from "@/contexts/PageNavContext";
import { toast } from "sonner";
import { submitWaitlistEntry } from "@/api/waitlistApi";
import { Link } from "@tanstack/react-router";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/join")({
  component: JoinPage,
});

// --- Main Page Component ---

function JoinPage() {
  const setPageNav = useSetPageNav();

  useEffect(() => {
    setPageNav(<JoinPageNav />);
    return () => setPageNav(null);
  }, [setPageNav]);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />

      <section className="bg-primary p-6 md:p-12">
        <h1 className="text-2xl md:text-5xl font-bold text-secondary mb-8 leading-tight">
          Looking for friendly, easygoing housemates to join me in a beautiful, spacious share house
          in Forrestfield, Perth. Enjoy a relaxed, welcoming vibe, leafy gardens, and plenty of
          space to make yourself at home.
        </h1>
      </section>

      <MarqueeSection />
      <RoomsSection />
      <AboutSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}

// --- Sub-Components ---

function JoinPageNav() {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {[
        { name: "Rooms", sectionId: "rooms" },
        { name: "About", sectionId: "about" },
        { name: "FAQ", sectionId: "faq" },
      ].map((item) => (
        <button
          key={item.name}
          onClick={() => scrollTo(item.sectionId)}
          className="text-sm md:text-base font-medium px-2 text-foreground hover:text-primary cursor-pointer">
          {item.name}
        </button>
      ))}
    </>
  );
}

function HeroSection() {
  return (
    <section id="gallery" className="relative h-[80vh] w-full">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src="https://stanbrook.me/livingroom.jpeg"
          alt="Main house view"
          className="w-full h-full object-cover object-center"
        />
        {/* Overlay for better text contrast if needed, currently clear */}
      </div>

      <div className="relative z-10 h-full flex items-center justify-center">
        <ApplicationDialog
          trigger={
            <button className="border-2 border-background text-background px-10 py-4 md:py-10 rounded-full text-3xl font-semibold backdrop-blur-lg shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none hover:bg-background/10">
              Join Our House
            </button>
          }
        />
      </div>
    </section>
  );
}

function MarqueeSection() {
  return (
    <section className="h-32 py-4 md:py-6 bg-background overflow-hidden flex items-center relative select-none">
      <div
        className="flex items-center whitespace-nowrap space-x-16 animate-marquee"
        style={{ minWidth: "100%" }}>
        {[...Array(16)].map((_, i) => (
          <h2 key={i} className="text-3xl md:text-4xl font-bold text-secondary">
            Available Rooms
          </h2>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </section>
  );
}

function RoomsSection() {
  const rooms = [
    {
      name: "Room One",
      price: "$250/week",
      status: "Not Available",
      available: false,
      image: "https://stanbrook.me/room1.jpeg",
      size: "Large (4.2m x 3.8m)",
      contract: "6-12 month lease",
      utilities: "Not included",
      furnished: "Partially furnished",
    },
    {
      name: "Room Two",
      price: "$200/week",
      status: "Available Jul 2026",
      available: true,
      image: "https://stanbrook.me/room2.jpeg",
      size: "Medium (3.5m x 3.2m)",
      contract: "6 month lease",
      utilities: "Not included",
      furnished: "Unfurnished",
    },
    {
      name: "Room Three",
      price: "$200/week",
      status: "Not Available",
      available: false,
      image: "https://stanbrook.me/room3.jpeg",
      size: "Medium (3.6m x 3.0m)",
      contract: "6 month lease",
      utilities: "Not included",
      furnished: "Unfurnished",
    },
    {
      name: "Room Four",
      price: "$200/week",
      status: "Available Feb 2026",
      available: true,
      image: "https://stanbrook.me/room4.jpeg",
      size: "Small (3.0m x 2.8m)",
      contract: "Flexible lease",
      utilities: "Not included",
      furnished: "Unfurnished",
    },
  ];

  return (
    <section id="rooms" className="bg-secondary">
      <div className="grid md:grid-cols-1">
        {rooms.map((room, index) => (
          <div
            key={index}
            className="room-card bg-primary overflow-hidden relative group transition-all duration-200 flex flex-col md:flex-row md:h-96 lg:h-[28rem]">
            <div className="relative w-full md:w-1/2 h-56 md:h-full">
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="hidden md:block absolute inset-0 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
            <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold text-secondary mr-2">{room.name}</h3>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold tracking-wide bg-secondary text-primary`}>
                  {room.available ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-sm text-secondary-foreground">
                <div className="flex gap-2">
                  <span className="font-semibold">Size:</span> {room.size}
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">Contract:</span> {room.contract}
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">Utilities:</span> {room.utilities}
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">Furnished:</span> {room.furnished}
                </div>
              </div>

              <p className="text-lg text-secondary-foreground mb-4">
                Comfortable single room with shared bathroom and plenty of natural light.
              </p>

              <div className="flex justify-between items-end mt-auto">
                <span className="text-2xl font-bold text-secondary">{room.price}</span>
                <span className="text-sm font-semibold text-secondary-foreground">
                  {room.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="min-h-screen bg-secondary relative">
      {/* Background Image Container */}
      <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden">
        <img
          src="https://stanbrook.me/profile-background.jpg"
          alt="Background"
          className="w-full h-full object-cover object-center opacity-80"
        />
      </div>

      <div className="w-full h-full px-0 relative flex items-center justify-center min-h-[80vh] py-12">
        <div className="z-10 w-full max-w-md">
          <div className="bg-secondary text-primary overflow-hidden rounded-lg shadow-2xl mx-4">
            <div className="h-64 sm:h-80">
              <img
                src="https://stanbrook.me/profile.jpg"
                alt="Housemate Jared"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-8 flex flex-col items-center text-left">
              <h2 className="text-4xl font-bold mb-6">About Your Housemate</h2>
              <div className="space-y-4 text-xl sm:text-2xl font-medium leading-relaxed">
                <p>
                  Hi! I'm Jared, a 23-year-old IT student. Two of my good friends are moving soon,
                  and I'm keen for some new friendly faces to fill their rooms! I love gardening,
                  cooking, and everything computers.
                </p>
                <p className="text-secondary-foreground/80 text-lg">
                  P.S. If you're an employer snooping around my projects, stop lurking and just hire
                  me already! I promise you won't regret it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const questions = [
    {
      question: "What are the main house rules?",
      answer:
        "We value respect, cleanliness, and open communication. Please clean up after yourself, be mindful of shared spaces, and treat everyone with kindness.",
    },
    {
      question: "Are pets allowed?",
      answer:
        "Pets are welcome if they're friendly and get along with everyone! Please discuss with us first if you have a pet or plan to bring one.",
    },
    {
      question: "Are utilities included in the rent?",
      answer:
        "Utilities are not included in the rent. We split electricity, water, and internet bills equally among housemates each month.",
    },
    {
      question: "What kind of internet do you have?",
      answer:
        "We have fast Fibre to the Premises (FTTP) NBN internet, perfect for working from home, streaming, and gaming.",
    },
    {
      question: "What is the house culture like?",
      answer:
        "Our house is relaxed, friendly, and inclusive. We enjoy the occasional shared meal or movie night, but also respect each other's privacy and downtime.",
    },
    {
      question: "Can I have guests over?",
      answer:
        "Guests are welcome, but please be considerate of other housemates. Overnight guests should be discussed in advance, and parties are kept low-key.",
    },
    {
      question: "Is there a cleaning roster?",
      answer:
        "Yes, we have a simple cleaning roster to keep shared spaces tidy. Everyone does their part to maintain a comfortable home.",
    },
    {
      question: "What about parking?",
      answer:
        "There is off-street parking available for housemates. Please let us know if you have a car so we can arrange spots fairly.",
    },
    {
      question: "Can I decorate my room?",
      answer:
        "Absolutely! You're welcome to make your room your own, as long as any major changes are discussed first.",
    },
  ];

  return (
    <section id="faq" className="bg-primary text-primary min-h-[50vh]">
      <div className="grid md:grid-cols-2 gap-8 container mx-auto px-4 py-16">
        <h2 className="text-4xl md:text-5xl text-secondary font-bold mb-4 p-4 leading-tight sticky top-8 self-start">
          Everything you need to know about living here, our house rules, culture, and what to
          expect as a housemate.
        </h2>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {questions.map((q, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-none bg-secondary rounded-xl px-2">
                <AccordionTrigger className="text-primary font-semibold text-xl px-6 py-6 hover:no-underline hover:opacity-90 [&[data-state=open]>svg]:rotate-45 [&>svg]:hidden">
                  <div className="flex justify-between w-full items-center text-left mr-4">
                    {q.question}
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-secondary transition-transform duration-200 shrink-0">
                      <Plus className="w-6 h-6 transition-transform duration-200" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 text-lg">{q.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function ApplicationDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    employment: "",
    references: "",
    about: "",
    pets: "No pets",
    agreeToTerms: false,
  });

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.employment ||
      !formData.agreeToTerms
    ) {
      toast.error("Missing Fields", { description: "Please fill in all required fields." });
      return;
    }

    submitWaitlistEntry({ value: formData });

    toast.success("Application Submitted", {
      description: `We'll be in touch soon!`,
    });

    setOpen(false);
    // Reset form
    setFormData({
      fullName: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      employment: "",
      references: "",
      about: "",
      pets: "No pets",
      agreeToTerms: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-primary">Join Our Waitlist</DialogTitle>
          <DialogDescription>
            Tell us a bit about yourself so we can see if we're a good match!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="0400 000 000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employment">Current Employment *</Label>
            <Input
              id="employment"
              value={formData.employment}
              onChange={(e) => handleInputChange("employment", e.target.value)}
              placeholder="Job title and company"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="references">Previous Rental References</Label>
            <Textarea
              id="references"
              value={formData.references}
              onChange={(e) => handleInputChange("references", e.target.value)}
              placeholder="Previous landlord/property manager contact details"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">Tell us about yourself</Label>
            <Textarea
              id="about"
              value={formData.about}
              onChange={(e) => handleInputChange("about", e.target.value)}
              placeholder="Hobbies, lifestyle, what you're looking for in a share house..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pets">Do you have any pets?</Label>
            <Select value={formData.pets} onValueChange={(val) => handleInputChange("pets", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No pets">No pets</SelectItem>
                <SelectItem value="Cat(s)">Cat(s)</SelectItem>
                <SelectItem value="Dog(s)">Dog(s)</SelectItem>
                <SelectItem value="Other">Other (specify in notes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <Checkbox
              id="terms"
              checked={formData.agreeToTerms}
              onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked)}
            />
            <Label
              htmlFor="terms"
              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="underline font-semibold">
                terms and conditions
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="underline font-semibold">
                privacy policy
              </Link>{" "}
              *
            </Label>
          </div>

          <Button onClick={handleSubmit} className="w-full text-lg py-6" size="lg">
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FooterSection() {
  return (
    <footer className="bg-secondary-foreground text-white pt-16 pb-8 mt-auto">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center md:items-start">
          <h3 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-2">
            Forrestfield
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10 mt-8">
          <div>
            <h5 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Menu
            </h5>
            <ul className="space-y-2">
              <li>
                <a href="#rooms" className="hover:text-primary transition-colors">
                  Rooms
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-primary transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-primary transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Socials
            </h5>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.facebook.com/jared.stanbrook"
                  target="_blank"
                  rel="noopener"
                  className="hover:text-primary transition-colors">
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="mailto:jared@stanbrook.me"
                  className="hover:text-primary transition-colors">
                  Email
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Legals
            </h5>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
              Credits
            </h5>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/JaredStanbrook"
                  target="_blank"
                  rel="noopener"
                  className="hover:text-primary transition-colors">
                  Site: Jared Stanbrook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-400">
          <p className="mb-2">
            © Forrestfield Share House sits on the lands of the Whadjuk Noongar people. We pay our
            respects to Elders past, present, and emerging.
          </p>
          <p>
            Brought to you by{" "}
            <a
              href="https://github.com/JaredStanbrook"
              target="_blank"
              rel="noopener"
              className="underline hover:text-white">
              Jared Stanbrook
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
