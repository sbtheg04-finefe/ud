import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetUser, 
  useUpdateUser,
  getGetUserQueryKey
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().optional(),
  locationText: z.string().optional(),
  dietaryPreferences: z.string().optional(),
  cookingInterests: z.string().optional(),
});

export default function EditProfile() {
  const { userId } = useParams();
  const id = Number(userId);
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetUser(id, { query: { enabled: !!id, queryKey: getGetUserQueryKey(id) } });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      locationText: "",
      dietaryPreferences: "",
      cookingInterests: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName,
        bio: user.bio || "",
        locationText: user.locationText || "",
        dietaryPreferences: user.dietaryPreferences?.join(", ") || "",
        cookingInterests: user.cookingInterests?.join(", ") || "",
      });
    }
  }, [user, form]);

  const updateUser = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
        setLocation(`/profile/${id}`);
      }
    }
  });

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateUser.mutate({
      userId: id,
      data: {
        displayName: values.displayName,
        bio: values.bio,
        locationText: values.locationText,
        dietaryPreferences: values.dietaryPreferences ? values.dietaryPreferences.split(",").map(t => t.trim()) : [],
        cookingInterests: values.cookingInterests ? values.cookingInterests.split(",").map(t => t.trim()) : [],
      }
    });
  };

  if (currentUser?.id !== id && currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 text-center">
          <h2>You can only edit your own profile.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Edit Profile</h1>
          <p className="text-muted-foreground">Update your personal information.</p>
        </div>

        <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
          {!isLoading && user && (
            <div className="flex flex-col items-center mb-8 pb-8 border-b border-border/50">
              <Avatar className="h-24 w-24 border-2 border-background shadow-sm mb-4">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="rounded-full">Change Photo</Button>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A bit about you and your cooking style..." className="resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Brooklyn, NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dietaryPreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dietary Preferences (comma separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="vegetarian, gluten-free" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cookingInterests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooking Interests (comma separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="baking, grilling, meal prep" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-6 flex justify-end gap-4">
                <Button type="button" variant="ghost" onClick={() => setLocation(`/profile/${id}`)}>Cancel</Button>
                <Button type="submit" className="rounded-full px-8" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
