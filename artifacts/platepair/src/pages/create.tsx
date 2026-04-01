import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateMeal, 
  useCreateVideo, 
  useListGroups,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChefHat, PlayCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mealSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "dessert", "brunch", "other"]),
  shareStatus: z.enum(["idea", "cooking", "available", "finished"]),
  servings: z.coerce.number().optional(),
  locationText: z.string().optional(),
  ingredientsSummary: z.string().optional(),
  instructionsSummary: z.string().optional(),
  groupId: z.coerce.number().optional(),
  imageUrl: z.string().optional(),
  cuisineTags: z.string().optional(),
});

const videoSchema = z.object({
  title: z.string().min(3, "Title is required"),
  caption: z.string().optional(),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  groupId: z.coerce.number().optional(),
  tags: z.string().optional(),
});

export default function Create() {
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();
  const { data: groups } = useListGroups({ query: { enabled: true } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"meal" | "video">("meal");

  const mealForm = useForm<z.infer<typeof mealSchema>>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      title: "",
      description: "",
      mealType: "dinner",
      shareStatus: "idea",
      servings: undefined,
      locationText: "",
      ingredientsSummary: "",
      instructionsSummary: "",
      imageUrl: "",
      cuisineTags: "",
    },
  });

  const videoForm = useForm<z.infer<typeof videoSchema>>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      caption: "",
      videoUrl: "",
      thumbnailUrl: "",
      tags: "",
    },
  });

  const createMeal = useCreateMeal({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Meal shared successfully!" });
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
        setLocation(`/meals/${data.id}`);
      },
    }
  });

  const createVideo = useCreateVideo({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Hack shared successfully!" });
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
        setLocation(`/videos`);
      },
    }
  });

  const onMealSubmit = (values: z.infer<typeof mealSchema>) => {
    if (!user) return;
    createMeal.mutate({
      data: {
        ...values,
        authorId: user.id,
        groupId: values.groupId || undefined,
        cuisineTags: values.cuisineTags ? values.cuisineTags.split(",").map(t => t.trim()) : [],
        dietaryTags: [],
      }
    });
  };

  const onVideoSubmit = (values: z.infer<typeof videoSchema>) => {
    if (!user) return;
    createVideo.mutate({
      data: {
        ...values,
        authorId: user.id,
        groupId: values.groupId || undefined,
        tags: values.tags ? values.tags.split(",").map(t => t.trim()) : [],
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold mb-2">Share with the Community</h1>
          <p className="text-muted-foreground">What's cooking in your kitchen today?</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="mb-8 h-14 p-1 bg-muted/50 rounded-2xl w-full flex">
            <TabsTrigger value="meal" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 text-base">
              <ChefHat size={20} />
              Share a Meal
            </TabsTrigger>
            <TabsTrigger value="video" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 text-base">
              <PlayCircle size={20} />
              Post a Hack
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meal" className="mt-0">
            <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
              <Form {...mealForm}>
                <form onSubmit={mealForm.handleSubmit(onMealSubmit)} className="space-y-6">
                  <FormField
                    control={mealForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you making?</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Spicy Tomato Pasta" className="h-12 text-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={mealForm.control}
                      name="mealType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meal Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="breakfast">Breakfast</SelectItem>
                              <SelectItem value="brunch">Brunch</SelectItem>
                              <SelectItem value="lunch">Lunch</SelectItem>
                              <SelectItem value="dinner">Dinner</SelectItem>
                              <SelectItem value="snack">Snack</SelectItem>
                              <SelectItem value="dessert">Dessert</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mealForm.control}
                      name="shareStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="idea">Just an Idea</SelectItem>
                              <SelectItem value="cooking">Cooking Now</SelectItem>
                              <SelectItem value="available">Available to Share</SelectItem>
                              <SelectItem value="finished">Finished / Eaten</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={mealForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell us about this dish..." className="resize-none h-24" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={mealForm.control}
                      name="servings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Servings</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mealForm.control}
                      name="groupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Share with Group</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Public (No group)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Public (No group)</SelectItem>
                              {groups?.map(g => (
                                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <Button type="button" variant="outline" className="w-full h-24 border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50">
                      <ImageIcon size={24} className="mb-2" />
                      <span>Upload Photo</span>
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">Optional but highly recommended!</p>
                  </div>

                  <div className="pt-4 flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => setLocation("/")}>Cancel</Button>
                    <Button type="submit" className="rounded-full px-8" disabled={createMeal.isPending}>
                      {createMeal.isPending ? "Posting..." : "Share Meal"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-0">
            <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
              <Form {...videoForm}>
                <form onSubmit={videoForm.handleSubmit(onVideoSubmit)} className="space-y-6">
                  <div className="pt-2 pb-6">
                    <Button type="button" variant="outline" className="w-full h-40 border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 bg-secondary/5 border-secondary/20">
                      <PlayCircle size={32} className="mb-3 text-secondary" />
                      <span className="font-medium text-foreground">Upload Video</span>
                      <span className="text-xs mt-1">MP4, MOV up to 60s</span>
                    </Button>
                  </div>

                  <FormField
                    control={videoForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., How to dice an onion perfectly" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={videoForm.control}
                    name="caption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caption</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Add some details..." className="resize-none h-24" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={videoForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (comma separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="knifeskills, prep, basics" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => setLocation("/")}>Cancel</Button>
                    <Button type="submit" className="rounded-full px-8" disabled={createVideo.isPending}>
                      {createVideo.isPending ? "Posting..." : "Share Hack"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
